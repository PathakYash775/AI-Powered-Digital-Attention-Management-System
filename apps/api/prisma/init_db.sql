DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'attention_app') THEN
    CREATE ROLE attention_app WITH LOGIN PASSWORD 'attention_dev_secret_change_me';
  ELSE
    ALTER ROLE attention_app WITH LOGIN PASSWORD 'attention_dev_secret_change_me';
  END IF;
END
$$;

SELECT 'CREATE DATABASE attention_dev OWNER attention_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'attention_dev')\gexec

SELECT 'CREATE DATABASE attention_test OWNER attention_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'attention_test')\gexec

GRANT ALL PRIVILEGES ON DATABASE attention_dev TO attention_app;
GRANT ALL PRIVILEGES ON DATABASE attention_test TO attention_app;
