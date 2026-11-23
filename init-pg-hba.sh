#!/bin/bash
set -e

# This script runs on container initialization to configure pg_hba.conf
# for trust authentication from all hosts (development only)

cat > /var/lib/postgresql/data/pg_hba.conf << EOF
# PostgreSQL Client Authentication Configuration File

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     trust
# IPv4 local connections:
host    all             all             127.0.0.1/32            trust
# IPv6 local connections:
host    all             all             ::1/128                 trust
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     trust
host    replication     all             127.0.0.1/32            trust
host    replication     all             ::1/128                 trust

# Allow all connections from any host (for development)
host    all             all             all                     trust
EOF

echo "pg_hba.conf configured for trust authentication"