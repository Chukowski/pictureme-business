# Test & Debug Scripts

This directory contains various test scripts, debugging tools, and development utilities that are not part of the main application but are useful for testing and troubleshooting.

## Files

### Python Debug Scripts
- `debug_user.py` - Debug user authentication and database records
- `inspect_id6.py` - Inspect specific user ID 6 database records  
- `fix_email_id6.py` - Fix email issues for user ID 6
- `list_tables.py` - List database tables and schema
- `sync_user.py` - Sync user data between systems
- `run_migration_005.py` - Run specific database migration
- `create_test_user.py` - Create test users for development
- `test_db.py` - Database connection and testing utilities

### JavaScript Test Scripts  
- `test-share-code.js` - Test photo share code functionality
- `auth-server.js` - Authentication server testing
- `auth-server-simple.js` - Simple auth server for testing

### Shell Scripts
- `setup-demo.sh` - Demo setup and initialization

## Usage

Most scripts can be run directly from the test directory:

```bash
# Python scripts
python test/debug_user.py
python test/list_tables.py

# JavaScript scripts  
node test/test-share-code.js SHARE_CODE

# Shell scripts
./test/setup-demo.sh
```

## Note

These scripts are for development and testing purposes only and should not be included in production builds or deployments.