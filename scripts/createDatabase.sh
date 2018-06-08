#!/usr/bin/env sh

psql -U postgres postgres -c "CREATE DATABASE $(sed -rn  's/database.+\/(.+)/\1/p' /tmp/config)"

psql -U postgres $(sed -rn  's/database.+\/(.+)/\1/p' /tmp/config) -f /tmp/postgresql.sql