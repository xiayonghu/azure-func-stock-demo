import datetime
import decimal
import json
import logging
import os

import azure.functions as func
import pyodbc

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

QUERY = """
SELECT *
FROM dbo.StockHistory
WHERE Symbol = ?
  AND (? IS NULL OR [Date] >= ?)
  AND (? IS NULL OR [Date] <= ?)
ORDER BY [Date]
"""


def _to_json(value):
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, (datetime.date, datetime.datetime, datetime.time)):
        return value.isoformat()
    raise TypeError(f"Not JSON serializable: {type(value).__name__}")


def _connection_string():
    # A full connection string wins; otherwise build one from the individual settings.
    conn_str = os.environ.get("SQL_CONNECTION_STRING", "")
    if "=" in conn_str:
        return conn_str

    server = os.environ.get("SQL_SERVER", "stockdbserver.database.windows.net")
    database = os.environ.get("SQL_DATABASE", "StockDB")
    user = os.environ.get("SQL_USER")
    password = os.environ.get("SQL_PASSWORD")
    if not user or not password:
        return None

    # Braces let the password contain ';' or '='; a literal '}' is escaped as '}}'.
    password = password.replace("}", "}}")
    return (
        "Driver={ODBC Driver 18 for SQL Server};"
        f"Server=tcp:{server},1433;Database={database};"
        f"Uid={user};Pwd={{{password}}};"
        "Encrypt=yes;TrustServerCertificate=no;"
    )


def _json_response(body, status_code=200):
    return func.HttpResponse(
        json.dumps(body, default=_to_json),
        status_code=status_code,
        mimetype="application/json",
    )


@app.route(route="stockhistory", methods=["GET"])
def stock_history(req: func.HttpRequest) -> func.HttpResponse:
    symbol = (req.params.get("Symbol") or req.params.get("symbol") or "").strip().upper()
    if not symbol:
        return _json_response({"error": "Query parameter 'Symbol' is required."}, 400)

    start = req.params.get("from") or None
    end = req.params.get("to") or None

    conn_str = _connection_string()
    if not conn_str:
        return _json_response({"error": "SQL_USER and SQL_PASSWORD are not configured."}, 500)

    try:
        # Serverless databases can take up to a minute to resume from pause.
        with pyodbc.connect(conn_str, timeout=60) as conn:
            cursor = conn.cursor()
            cursor.execute(QUERY, symbol, start, start, end, end)
            columns = [c[0] for c in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    except pyodbc.Error:
        logging.exception("Query failed for symbol %s", symbol)
        return _json_response({"error": "Database query failed."}, 500)

    if not rows:
        return _json_response({"symbol": symbol, "count": 0, "history": []}, 404)

    return _json_response({"symbol": symbol, "count": len(rows), "history": rows})
