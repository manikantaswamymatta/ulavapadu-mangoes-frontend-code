# Ulavapadu Mangoes DB Notes

This backend reads database credentials from `creds/db_creds.json`.

## Active backend schema

- Schema used by both customer + admin APIs: `ulavapadumangoes_schema`
- Catalog data seeded: Ulavapadu mango categories/products only

## Connection management recommendations

1. Keep application DB pool sizes low (`pool_size=1`, `max_overflow=0`) to avoid connection pressure.
2. If you have admin-level database privileges, create a dedicated role/database:
   - DB: `ulavapadumangoes_sb`
   - Role: `ulavapadumangoes_user`
   - Connection limit: `50`
3. Run `backend-code/scripts/setup_ulavapadumangoes_db.py` to provision schema/tables/data.
