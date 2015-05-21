CREATE OR REPLACE FUNCTION influx_post(data JSON) RETURNS INTEGER as $$
DECLARE
    col TEXT;
    table_cols TEXT[];
    data_cols TEXT[];
    querybits TEXT[];
    tblquery TEXT;
    valuerow JSON;
    textrows TEXT[];
    textrow TEXT;
    arrayrow TEXT[];
    value TEXT;
BEGIN
    SELECT INTO data_cols array_agg(cols) FROM (SELECT json_array_elements_text(data->'columns') cols) data;
    IF NOT EXISTS (SELECT * FROM pg_tables WHERE schemaname='public' AND tablename=data->>'name') THEN
        --create table
        FOREACH col IN ARRAY data_cols LOOP
            IF (SELECT NOT(col = ANY('{time,sequence_number}'::TEXT[]))) THEN
                SELECT array_append(querybits, format('%I TEXT', col)) INTO querybits;
            END IF;
        END LOOP;
        EXECUTE format('CREATE TABLE %I (time BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000 + EXTRACT(MICROSECONDS FROM now())), sequence_number SERIAL, ', data->>'name') || array_to_string(querybits, ', ') || ')';
    ELSE
        SELECT INTO table_cols array_agg(column_name::text) AS col FROM information_schema.columns WHERE table_schema='public' AND table_name=data->>'name';
        IF NOT (table_cols @> data_cols) THEN
            --alter table
            FOREACH col IN ARRAY data_cols
            LOOP
                IF (SELECT NOT(col = ANY(table_cols))) THEN
                    SELECT array_append(querybits, format('ADD COLUMN %I TEXT', col)) INTO querybits;
                END IF;
            END LOOP;
            EXECUTE format('ALTER TABLE %I', data->>'name') || array_to_string(querybits, ', ');
        END IF;
    END IF;
    FOR valuerow IN SELECT json_array_elements(data->'points')
    LOOP
        querybits = ARRAY[]::TEXT[];
        SELECT INTO arrayrow array_agg(vals) FROM (SELECT json_array_elements_text(valuerow) vals) ars;
        FOREACH value IN ARRAY arrayrow
        LOOP
            SELECT array_append(querybits, format('%L', value)) INTO querybits;
        END LOOP;
        SELECT array_append(textrows, '(' || array_to_string(querybits, ', ') || ')') INTO textrows;
    END LOOP;
    EXECUTE format('INSERT INTO %I ', data->>'name') || '(' || array_to_string(data_cols, ', ') || ') VALUES ' || array_to_string(textrows, ', ');
    RETURN cardinality(textrows);
END;
$$ language 'plpgsql';
