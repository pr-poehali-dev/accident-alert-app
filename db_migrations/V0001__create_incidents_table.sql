CREATE TABLE t_p17784444_accident_alert_app.incidents (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('dtp', 'fire', 'accident')),
  title VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO t_p17784444_accident_alert_app.incidents (type, title, address, description, lat, lng, status) VALUES
  ('dtp',      'ДТП с пострадавшими',    'ул. Ленина, 45',       'Столкновение двух автомобилей. Пострадавших нет. Движение затруднено.', 55.751244, 37.618423, 'active'),
  ('fire',     'Пожар в здании',         'пр. Мира, 12',         'Возгорание на 3-м этаже жилого дома. Пожарные на месте.',               55.764450, 37.605700, 'active'),
  ('accident', 'Коммунальная авария',    'ул. Садовая, 78',      'Прорыв водопровода. Перекрыто движение на перекрёстке.',                55.740900, 37.630100, 'active'),
  ('dtp',      'ДТП (незначительное)',   'Кутузовский пр., 4',   'Небольшое столкновение, помощь не требуется.',                          55.745000, 37.565000, 'resolved'),
  ('fire',     'Возгорание автомобиля',  'ул. Тверская, 23',     'Загорелся припаркованный автомобиль. МЧС прибыло.',                     55.770000, 37.610000, 'resolved');
