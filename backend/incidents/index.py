import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p17784444_accident_alert_app")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def format_time(created_at) -> str:
    """Преобразует дату в читаемый формат 'N мин назад'"""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    diff = int((now - created_at).total_seconds())
    if diff < 60:
        return "только что"
    if diff < 3600:
        return f"{diff // 60} мин назад"
    if diff < 86400:
        h = diff // 3600
        return f"{h} ч назад"
    d = diff // 86400
    return f"{d} д назад"

def handler(event: dict, context) -> dict:
    """Управление инцидентами: GET — список, POST — добавить, PUT — изменить статус"""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")

    # GET /incidents — получить все инциденты
    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, type, title, address, description, lat, lng, status, created_at "
            f"FROM {SCHEMA}.incidents ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        incidents = [
            {
                "id": r[0],
                "type": r[1],
                "title": r[2],
                "address": r[3],
                "description": r[4],
                "lat": r[5],
                "lng": r[6],
                "status": r[7],
                "time": format_time(r[8]),
            }
            for r in rows
        ]
        return {
            "statusCode": 200,
            "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps({"incidents": incidents}, ensure_ascii=False),
        }

    # POST /incidents — добавить инцидент
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        inc_type = body.get("type", "dtp")
        title = body.get("title", "").strip()
        address = body.get("address", "").strip()
        description = body.get("description", "").strip()
        lat = float(body.get("lat", 0))
        lng = float(body.get("lng", 0))

        if not title or not address:
            return {
                "statusCode": 400,
                "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"error": "title и address обязательны"}, ensure_ascii=False),
            }

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.incidents (type, title, address, description, lat, lng, status) "
            f"VALUES (%s, %s, %s, %s, %s, %s, 'active') RETURNING id, created_at",
            (inc_type, title, address, description, lat, lng),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return {
            "statusCode": 201,
            "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps({
                "id": row[0],
                "type": inc_type,
                "title": title,
                "address": address,
                "description": description,
                "lat": lat,
                "lng": lng,
                "status": "active",
                "time": "только что",
            }, ensure_ascii=False),
        }

    # PUT /incidents — обновить статус
    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        inc_id = int(body.get("id", 0))
        status = body.get("status", "resolved")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.incidents SET status = %s WHERE id = %s",
            (status, inc_id),
        )
        conn.commit()
        cur.close()
        conn.close()

        return {
            "statusCode": 200,
            "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps({"ok": True}, ensure_ascii=False),
        }

    return {"statusCode": 405, "headers": CORS, "body": "Method Not Allowed"}
