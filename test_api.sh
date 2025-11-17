#!/bin/bash

# API Testing Script for Steam Games Backend
# Tests all CRUD endpoints

BASE_URL="http://localhost:3100"
API_URL="${BASE_URL}/api/games"

echo "=========================================="
echo "Steam Games API - CRUD Endpoint Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to make API call and check response
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_code=${5:-200}  # Default to 200, but allow override
    
    echo -n "Testing: $name... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Check if we got the expected status code
    if [ "$expected_code" == "2xx" ]; then
        # Accept any 2xx status code
        if [ $http_code -ge 200 ] && [ $http_code -lt 300 ]; then
            print_result 0
        else
            print_result 1
            echo "Expected 2xx, got: $http_code"
        fi
    elif [ $http_code -eq $expected_code ]; then
        print_result 0
    else
        print_result 1
        echo "Expected HTTP $expected_code, got: $http_code"
    fi
    
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
}

echo "=========================================="
echo "1. HEALTH CHECK"
echo "=========================================="
test_endpoint "Health Check" "GET" "${BASE_URL}/health"

echo "=========================================="
echo "2. GET STATISTICS"
echo "=========================================="
test_endpoint "Get Database Statistics" "GET" "${API_URL}/stats"

echo "=========================================="
echo "3. READ - GET ALL GAMES"
echo "=========================================="
test_endpoint "Get All Games (default pagination)" "GET" "${API_URL}"
test_endpoint "Get Games (page 1, limit 5)" "GET" "${API_URL}?page=1&limit=5"
test_endpoint "Get Games (page 2, limit 5)" "GET" "${API_URL}?page=2&limit=5"

echo "=========================================="
echo "4. READ - SEARCH AND FILTER"
echo "=========================================="
test_endpoint "Search Games by name" "GET" "${API_URL}?search=Portal"
test_endpoint "Filter by Genre" "GET" "${API_URL}?genre=Action&limit=5"
test_endpoint "Filter by Price Range" "GET" "${API_URL}?minPrice=0&maxPrice=20&limit=5"
test_endpoint "Filter by Metacritic Score" "GET" "${API_URL}?minScore=80&limit=5"
test_endpoint "Filter by Platform (Windows)" "GET" "${API_URL}?platform=windows&limit=5"
test_endpoint "Filter by Developer" "GET" "${API_URL}?developer=Valve&limit=5"
test_endpoint "Filter by Publisher" "GET" "${API_URL}?publisher=Valve&limit=5"

echo "=========================================="
echo "5. CREATE - ADD NEW GAME"
echo "=========================================="
NEW_GAME='{
  "appId": 999999,
  "name": "Test Game",
  "price": 19.99,
  "requiredAge": 12,
  "dlcCount": 2,
  "shortDescription": "A test game for API testing",
  "platforms": {
    "windows": true,
    "mac": false,
    "linux": true
  },
  "metacriticScore": 85,
  "recommendations": 1000,
  "ratings": {
    "positive": 900,
    "negative": 100
  },
  "averagePlaytimeForever": 120
}'
test_endpoint "Create New Game" "POST" "${API_URL}" "$NEW_GAME" "201"

echo "=========================================="
echo "6. READ - GET SPECIFIC GAME"
echo "=========================================="
echo "Fetching game by appId to get MongoDB ID..."
GAME_RESPONSE=$(curl -s "${API_URL}?limit=1")
GAME_ID=$(echo "$GAME_RESPONSE" | jq -r '.data[0]._id' 2>/dev/null)

if [ ! -z "$GAME_ID" ] && [ "$GAME_ID" != "null" ]; then
    echo "Found game ID: $GAME_ID"
    test_endpoint "Get Game by ID" "GET" "${API_URL}/${GAME_ID}"
else
    echo -e "${YELLOW}⚠ Could not fetch game ID, skipping GET by ID test${NC}"
    echo ""
fi

echo "Getting test game by appId..."
test_endpoint "Get Game by appId (999999)" "GET" "${API_URL}/app/999999"

echo "=========================================="
echo "7. UPDATE - MODIFY GAME"
echo "=========================================="
if [ ! -z "$GAME_ID" ] && [ "$GAME_ID" != "null" ]; then
    UPDATE_DATA='{
      "price": 14.99,
      "metacriticScore": 90,
      "shortDescription": "Updated description for testing"
    }'
    test_endpoint "Update Game" "PUT" "${API_URL}/${GAME_ID}" "$UPDATE_DATA"
    
    echo "Verify update..."
    test_endpoint "Get Updated Game" "GET" "${API_URL}/${GAME_ID}"
else
    echo -e "${YELLOW}⚠ Skipping UPDATE test - no game ID available${NC}"
    echo ""
fi

echo "=========================================="
echo "8. DELETE - REMOVE GAME"
echo "=========================================="
echo "Getting test game to delete..."
TEST_GAME_RESPONSE=$(curl -s "${API_URL}/app/999999")
TEST_GAME_ID=$(echo "$TEST_GAME_RESPONSE" | jq -r '.data._id' 2>/dev/null)

if [ ! -z "$TEST_GAME_ID" ] && [ "$TEST_GAME_ID" != "null" ]; then
    echo "Found test game ID: $TEST_GAME_ID"
    test_endpoint "Delete Test Game" "DELETE" "${API_URL}/${TEST_GAME_ID}"
    
    echo "Verify deletion..."
    echo -n "Checking if game is deleted... "
    DELETE_CHECK=$(curl -s "${API_URL}/${TEST_GAME_ID}")
    DELETE_STATUS=$(echo "$DELETE_CHECK" | jq -r '.success' 2>/dev/null)
    if [ "$DELETE_STATUS" == "false" ]; then
        print_result 0
        echo "Game successfully deleted (404 expected)"
    else
        print_result 1
        echo "Game still exists!"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Skipping DELETE test - test game not found${NC}"
    echo ""
fi

echo "=========================================="
echo "9. ERROR HANDLING TESTS"
echo "=========================================="
test_endpoint "Get Non-existent Game (invalid ID)" "GET" "${API_URL}/507f1f77bcf86cd799439011" "" "404"
test_endpoint "Create Duplicate Game (should fail)" "POST" "${API_URL}" "$NEW_GAME" "400"
test_endpoint "Invalid Route (404)" "GET" "${BASE_URL}/api/invalid" "" "404"

echo "=========================================="
echo "10. COMPLEX QUERIES"
echo "=========================================="
test_endpoint "Multiple Filters (genre + price + platform)" "GET" "${API_URL}?genre=Action&minPrice=0&maxPrice=30&platform=windows&limit=5"
test_endpoint "Search with Pagination" "GET" "${API_URL}?search=game&page=1&limit=10"

echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi
