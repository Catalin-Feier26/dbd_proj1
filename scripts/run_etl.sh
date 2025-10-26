#!/bin/bash

set -e

JOB_NAME="Full Steam Games ELT Pipeline"
PYTHON_SCRIPT="/scripts/preprocessing/preprocess.py"
LOAD_SCRIPT="/scripts/1_load.sql"
TRANSFORM_SCRIPT="/scripts/2_transform.sql"

PSQL_CMD="psql -X -q -t -A -v ON_ERROR_STOP=1"
LOG_ID=0

log_start() {
    echo "========================================="
    echo "STARTING JOB: $JOB_NAME"
    
    LOG_ID=$($PSQL_CMD -c \
        "INSERT INTO log.logs (jobname, status) VALUES ('$JOB_NAME', 'STARTED') RETURNING log_id;")
    
    if [ -z "$LOG_ID" ]; then
        echo "FATAL: Could not create log entry in database."
        exit 1
    fi
    echo "Log entry $LOG_ID created."
}

log_fail() {
    local error_msg=$(echo "$1" | tr "'" " ")
    echo "!!! JOB FAILED: $error_msg"
    $PSQL_CMD -c \
        "UPDATE log.logs 
         SET status = 'FAILED', end_date = NOW(), error_message = 'Job failed: $error_msg'
         WHERE log_id = $LOG_ID;"
    echo "========================================="
    exit 1
}

log_success() {
    echo "✅ JOB SUCCEEDED"
    $PSQL_CMD -c \
        "UPDATE log.logs SET status = 'SUCCESS', end_date = NOW() WHERE log_id = $LOG_ID;"
    echo "========================================="
}

trap 'log_fail "Script exited with error on line $LINENO"' ERR

log_start

# # Step 1: Preprocessing (Python)
# echo "Running Python preprocessing..."
# python3 $PYTHON_SCRIPT
# echo "Python preprocessing complete."

# # Step 2: Load to Staging (SQL)
# echo "Running Load script (1_load.sql)..."
# $PSQL_CMD -f $LOAD_SCRIPT
# echo "Load script complete."

# Step 3: Transform (SQL)
echo "Running Transform script (2_transform.sql)..."
$PSQL_CMD -f $TRANSFORM_SCRIPT
echo "Transform script complete." 

log_success