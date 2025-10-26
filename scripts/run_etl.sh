#!/bin/bash

set -e

JOB_NAME="Full Steam Games ELT Pipeline"
PYTHON_SCRIPT="/scripts/preprocessing/preprocess.py"
LOAD_SCRIPT="/scripts/1_load.sql"
TRANSFORM_SCRIPT="/scripts/2_transform.sql"

PSQL_CMD="psql -X -q -t -A -v ON_ERROR_STOP=1"
LOG_ID=0

log_start() {
    local ts=$(date -u +"%Y-%m-%d %H:%M:%SZ")
    echo "========================================="
    echo "[$ts] STARTING: $JOB_NAME"

    LOG_ID=$($PSQL_CMD -c \
        "INSERT INTO log.logs (jobname, status, start_date) VALUES ('ETL: Full Pipeline', 'STARTED', NOW()) RETURNING log_id;")
    
    if [ -z "$LOG_ID" ]; then
        echo "FATAL: Could not create log entry in database."
        exit 1
    fi
    echo "Log entry $LOG_ID created."
}

log_fail() {
    local error_msg=$(echo "$1" | tr "'" " ")
    local ts=$(date -u +"%Y-%m-%d %H:%M:%SZ")
    echo "[$ts] !!! JOB FAILED: $error_msg (log_id=$LOG_ID)"
    $PSQL_CMD -c \
        "UPDATE log.logs 
         SET status = 'FAILED', end_date = NOW(), error_message = 'Job failed: $error_msg'
         WHERE log_id = $LOG_ID;"
    echo "========================================="
    exit 1
}

log_success() {
    local ts=$(date -u +"%Y-%m-%d %H:%M:%SZ")
    echo "[$ts] ✅ JOB SUCCEEDED (log_id=$LOG_ID)"
    $PSQL_CMD -c \
        "UPDATE log.logs SET status = 'SUCCESS', end_date = NOW() WHERE log_id = $LOG_ID;"
    echo "========================================="
}

trap 'log_fail "Script exited with error on line $LINENO"' ERR

log_start

echo "-> Running Python preprocessing..."
python3 $PYTHON_SCRIPT
echo "-> Python preprocessing complete."

echo "-> Running Load script (staging load)..."
$PSQL_CMD -f $LOAD_SCRIPT
echo "-> Load script complete."

echo "-> Running Transform script (process -> production)..."
$PSQL_CMD -f $TRANSFORM_SCRIPT
echo "-> Transform script complete." 

log_success