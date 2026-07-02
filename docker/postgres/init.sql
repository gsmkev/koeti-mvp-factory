-- saas-template
CREATE USER saas_template WITH PASSWORD 'localdev';
CREATE DATABASE saas_template OWNER saas_template;

-- ponytail: add one block per app created with pnpm create-mvp
-- CREATE USER <app_name> WITH PASSWORD 'localdev';
-- CREATE DATABASE <app_name> OWNER <app_name>;

-- pos
CREATE USER pos WITH PASSWORD 'localdev';
CREATE DATABASE pos OWNER pos;

-- gastos
CREATE USER gastos WITH PASSWORD 'localdev';
CREATE DATABASE gastos OWNER gastos;
