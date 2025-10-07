# WinCC OA REST API Documentation

The REST API provides HTTP endpoints for all WinCC OA operations available through the GraphQL interface. All endpoints are available under the `/restapi` base path.

## Base URL

```
http://localhost:4000/restapi
```

## Authentication

Most endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

### Login

**POST** `/restapi/auth/login`

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "expiresAt": "2024-01-01T12:00:00.000Z"
}
```

### Role-Based Access Control

- **Admin role**: Full access to all endpoints including mutations
- **Readonly role**: Only GET requests (queries) are allowed

## Health Check

**GET** `/restapi/health`

Check API health status (no authentication required).

**Response:**
```json
{
  "status": "healthy",
  "service": "WinCC OA REST API",
  "uptime": 12345.67
}
```

---

## Data Points

### List Data Points

**GET** `/restapi/datapoints`

Search for data points by pattern.

**Query Parameters:**
- `pattern` (optional): Search pattern for data point names
- `dpType` (optional): Specific data point type to filter
- `ignoreCase` (optional): Case-insensitive search (true/false)

**Response:**
```json
{
  "datapoints": ["ExampleDP_Arg1.", "ExampleDP_Arg2."]
}
```

### Create Data Point

**POST** `/restapi/datapoints`

Create a new data point (Admin only).

**Request Body:**
```json
{
  "dpeName": "MyDataPoint.",
  "dpType": "ExampleDP_Arg",
  "systemId": 1,
  "dpId": 100
}
```

**Response:**
```json
{
  "success": true
}
```

### Get Data Point Value

**GET** `/restapi/datapoints/:dpeName/value`

Get the current value of a data point element.

**URL Parameters:**
- `dpeName`: Name of the data point element (URL encoded)

**Response:**
```json
{
  "value": 42.5
}
```

### Set Data Point Value

**PUT** `/restapi/datapoints/:dpeName/value`

Set the value of a data point element (Admin only).

**Request Body:**
```json
{
  "value": 42.5
}
```

**Response:**
```json
{
  "success": true
}
```

### Set Value with Wait

**PUT** `/restapi/datapoints/:dpeName/value/wait`

Set value and wait for confirmation (Admin only).

**Request Body:**
```json
{
  "value": 42.5
}
```

### Set Value with Timestamp

**PUT** `/restapi/datapoints/:dpeName/value/timed`

Set value with a specific timestamp (Admin only).

**Request Body:**
```json
{
  "value": 42.5,
  "time": "2024-01-01T12:00:00Z"
}
```

### Set Value with Timestamp and Wait

**PUT** `/restapi/datapoints/:dpeName/value/timed-wait`

Set value with timestamp and wait for confirmation (Admin only).

**Request Body:**
```json
{
  "value": 42.5,
  "time": "2024-01-01T12:00:00Z"
}
```

### Delete Data Point

**DELETE** `/restapi/datapoints/:dpName`

Delete a data point (Admin only).

**Response:**
```json
{
  "success": true
}
```

### Copy Data Point

**POST** `/restapi/datapoints/:source/copy`

Copy a data point (Admin only).

**URL Parameters:**
- `source`: Source data point name (URL encoded)

**Request Body:**
```json
{
  "destination": "NewDataPoint.",
  "driver": 1
}
```

### Check Data Point Exists

**GET** `/restapi/datapoints/:dpeName/exists`

Check if a data point exists.

**Response:**
```json
{
  "exists": true
}
```

### Get Element Type

**GET** `/restapi/datapoints/:dpeName/type`

Get the element type of a data point element.

**Response:**
```json
{
  "elementType": "FLOAT"
}
```

### Get Data Point Type Name

**GET** `/restapi/datapoints/:dpeName/dp-type`

Get the data point type name.

**Response:**
```json
{
  "dpType": "ExampleDP_Arg"
}
```

### Get Type Reference

**GET** `/restapi/datapoints/:dpeName/type-ref`

Get the type reference name.

**Response:**
```json
{
  "typeRef": "RefType"
}
```

### Get Value with Max Age

**GET** `/restapi/datapoints/:dpeName/value/max-age`

Get value from driver if older than specified age.

**Query Parameters:**
- `age`: Maximum age in milliseconds

**Response:**
```json
{
  "value": 42.5
}
```

### Get Historic Values

**GET** `/restapi/datapoints/:dpeName/history`

Get historic values for a time period.

**Query Parameters:**
- `startTime`: Start time (ISO8601)
- `endTime`: End time (ISO8601)

**Response:**
```json
{
  "values": [
    {"time": "2024-01-01T12:00:00Z", "value": 42.5},
    {"time": "2024-01-01T12:01:00Z", "value": 43.0}
  ]
}
```

### Get Attribute Type

**GET** `/restapi/datapoints/:dpAttributeName/attribute-type`

Get the data type of a data point attribute.

**Response:**
```json
{
  "ctrlType": "FLOAT_VAR"
}
```

---

## Data Point Types

### List Data Point Types

**GET** `/restapi/datapoint-types`

List all data point types.

**Query Parameters:**
- `pattern` (optional): Pattern to filter types
- `systemId` (optional): System ID
- `includeEmpty` (optional): Include types without existing data points (true/false)

**Response:**
```json
{
  "dpTypes": ["ExampleDP_Arg", "ExampleDP_Float", "ExampleDP_Int"]
}
```

### Create Data Point Type

**POST** `/restapi/datapoint-types`

Create a new data point type (Admin only).

**Request Body:**
```json
{
  "startNode": {
    "name": "MyDpType",
    "type": "FLOAT",
    "children": [
      {
        "name": "value",
        "type": "FLOAT"
      },
      {
        "name": "status",
        "type": "INT32"
      }
    ]
  }
}
```

### Get Type Structure

**GET** `/restapi/datapoint-types/:dpt/structure`

Get the structure of a data point type.

**Query Parameters:**
- `includeSubTypes` (optional): Include subtypes (true/false)

**Response:**
```json
{
  "structure": {
    "name": "MyDpType",
    "type": "FLOAT",
    "children": [...]
  }
}
```

### Change Data Point Type

**PUT** `/restapi/datapoint-types/:dpt`

Change an existing data point type (Admin only).

**Request Body:**
```json
{
  "startNode": {
    "name": "MyDpType",
    "type": "FLOAT",
    "children": [...]
  }
}
```

### Delete Data Point Type

**DELETE** `/restapi/datapoint-types/:dpt`

Delete a data point type (Admin only).

**Response:**
```json
{
  "success": true
}
```

### Get Type References

**GET** `/restapi/datapoint-types/:dpt/references`

Get references to other DPTs in a DPT.

**Response:**
```json
{
  "dptNames": ["RefType1", "RefType2"],
  "dpePaths": ["path1", "path2"]
}
```

### Get Type Usages

**GET** `/restapi/datapoint-types/:reference/usages`

Get all DPTs and DPs that contain a specific DPT as a reference.

**Response:**
```json
{
  "dptNames": ["ParentType1", "ParentType2"],
  "dpePaths": ["path1", "path2"]
}
```

---

## Tags

### Get Tags

**GET** `/restapi/tags`

Get multiple tags with value, timestamp, and status.

**Query Parameters:**
- `dpeNames`: Comma-separated list of data point element names

**Response:**
```json
{
  "tags": [
    {
      "name": "ExampleDP_1.value",
      "value": 42.5,
      "timestamp": "2024-01-01T12:00:00Z",
      "status": {"_online": {"_value": true}}
    }
  ]
}
```

### Get Tag History

**GET** `/restapi/tags/history`

Get historical data for multiple tags.

**Query Parameters:**
- `dpeNames`: Comma-separated list of data point element names
- `startTime`: Start time (ISO8601)
- `endTime`: End time (ISO8601)
- `limit` (optional): Maximum number of rows per tag
- `offset` (optional): Number of rows to skip

**Response:**
```json
{
  "history": [
    {
      "name": "ExampleDP_1.value",
      "values": [
        {"timestamp": "2024-01-01T12:00:00Z", "value": 42.5}
      ]
    }
  ]
}
```

---

## Alerts

### Get Alerts

**GET** `/restapi/alerts`

Get alert attributes.

**Query Parameters:**
- `alertsTime`: JSON-encoded array of alert times
- `dpeNames`: JSON-encoded array of data point element names
- `alertCount` (optional): Serial number of alert

**Example:**
```
GET /restapi/alerts?alertsTime=[{"time":"2024-01-01T12:00:00Z","count":1,"dpe":"ExampleDP."}]&dpeNames=["ExampleDP.:_alert_hdl.._text"]
```

**Response:**
```json
{
  "values": ["Alert text"]
}
```

### Get Alerts for Period

**GET** `/restapi/alerts/period`

Get alerts for a time period.

**Query Parameters:**
- `startTime`: Start time (ISO8601)
- `endTime`: End time (ISO8601)
- `names`: Comma-separated list of alert handling attribute names

**Response:**
```json
{
  "alertTimes": [
    {"time": "2024-01-01T12:00:00Z", "count": 1, "dpe": "ExampleDP."}
  ],
  "values": [["Alert text"]]
}
```

### Set Alert Attributes

**PUT** `/restapi/alerts`

Set alert attributes (Admin only).

**Request Body:**
```json
{
  "alerts": [
    {"time": "2024-01-01T12:00:00Z", "count": 1, "dpe": "ExampleDP."}
  ],
  "values": ["New alert text"]
}
```

### Set with Wait

**PUT** `/restapi/alerts/wait`

Set alert attributes with wait for confirmation (Admin only).

### Set with Timestamp

**PUT** `/restapi/alerts/timed`

Set alert attributes with specific timestamp (Admin only).

**Request Body:**
```json
{
  "time": "2024-01-01T12:00:00Z",
  "alerts": [...],
  "values": [...]
}
```

### Set with Timestamp and Wait

**PUT** `/restapi/alerts/timed-wait`

Set alert attributes with timestamp and wait (Admin only).

---

## CNS (Central Navigation Service)

### Views

#### Get Views

**GET** `/restapi/cns/views/:systemName`

Get all views for a system.

**Response:**
```json
{
  "views": ["view1", "view2"]
}
```

#### Create View

**POST** `/restapi/cns/views`

Create a new view (Admin only).

**Request Body:**
```json
{
  "view": "myView",
  "displayName": {"en_US": "My View", "de_DE": "Meine Ansicht"},
  "separator": "."
}
```

#### Delete View

**DELETE** `/restapi/cns/views/:view`

Delete a view with all its trees (Admin only).

#### Check View Exists

**GET** `/restapi/cns/views/:view/exists`

Check if a view exists.

**Response:**
```json
{
  "exists": true
}
```

### Trees

#### Get Trees

**GET** `/restapi/cns/trees/:view`

Get all trees in a view.

**Response:**
```json
{
  "trees": ["tree1", "tree2"]
}
```

#### Add Tree

**POST** `/restapi/cns/trees`

Create a tree or sub-tree (Admin only).

**Request Body:**
```json
{
  "cnsParentPath": "myView",
  "tree": {
    "name": "myTree",
    "displayName": {"en_US": "My Tree"},
    "dp": "ExampleDP.",
    "children": []
  }
}
```

#### Change Tree

**PUT** `/restapi/cns/trees/:cnsPath`

Replace a tree or sub-tree (Admin only).

#### Delete Tree

**DELETE** `/restapi/cns/trees/:cnsPath`

Delete a tree, sub-tree, or node (Admin only).

#### Check Tree Exists

**GET** `/restapi/cns/trees/:cnsPath/exists`

Check if a tree exists.

### Nodes

#### Add Node

**POST** `/restapi/cns/nodes`

Add a new node to a tree (Admin only).

**Request Body:**
```json
{
  "cnsParentPath": "myView/myTree",
  "name": "node1",
  "displayName": {"en_US": "Node 1"},
  "dp": "ExampleDP."
}
```

#### Get Children

**GET** `/restapi/cns/nodes/:cnsPath/children`

Get all children nodes.

**Response:**
```json
{
  "children": ["child1", "child2"]
}
```

#### Get Parent

**GET** `/restapi/cns/nodes/:cnsPath/parent`

Get parent node path.

**Response:**
```json
{
  "parent": "parentPath"
}
```

#### Get Root

**GET** `/restapi/cns/nodes/:cnsPath/root`

Get root node path of tree.

**Response:**
```json
{
  "root": "rootPath"
}
```

#### Get Display Name

**GET** `/restapi/cns/nodes/:cnsPath/display-name`

Get display names for node.

**Response:**
```json
{
  "displayName": {"en_US": "My Node", "de_DE": "Mein Knoten"}
}
```

#### Get Display Path

**GET** `/restapi/cns/nodes/:cnsPath/display-path`

Get display path for node.

**Response:**
```json
{
  "displayPath": {"en_US": "View/Tree/Node", "de_DE": "Ansicht/Baum/Knoten"}
}
```

#### Get Linked ID

**GET** `/restapi/cns/nodes/:cnsPath/id`

Get linked data point element name.

**Response:**
```json
{
  "id": "ExampleDP."
}
```

#### Check Node Exists

**GET** `/restapi/cns/nodes/:cnsPath/exists`

Check if a node exists.

#### Search by Name

**GET** `/restapi/cns/nodes/search/by-name`

Search nodes by name pattern.

**Query Parameters:**
- `pattern`: Search pattern with wildcards
- `viewPath` (optional): Path to view to search
- `searchMode` (optional): Search mode flags
- `langIdx` (optional): Language index
- `type` (optional): Node type filter

**Response:**
```json
{
  "nodes": ["path1", "path2"]
}
```

#### Search by Data

**GET** `/restapi/cns/nodes/search/by-data`

Search nodes by linked data point.

**Query Parameters:**
- `dpName`: Data point (element) name
- `type` (optional): Node type filter
- `viewPath` (optional): View path to search

**Response:**
```json
{
  "nodes": ["path1", "path2"]
}
```

#### Search ID Set

**GET** `/restapi/cns/nodes/search/id-set`

Get data point element names linked to nodes matching pattern.

**Query Parameters:**
- `pattern`: Search pattern with wildcards
- `viewPath` (optional): Path to view to search
- `searchMode` (optional): Search mode flags
- `langIdx` (optional): Language index
- `type` (optional): Node type filter

**Response:**
```json
{
  "ids": ["ExampleDP_1.", "ExampleDP_2."]
}
```

### Node Properties

#### Get Property

**GET** `/restapi/cns/nodes/:cnsPath/property/:key`

Get property value for a node.

**Response:**
```json
{
  "value": "property value"
}
```

#### Get Property Keys

**GET** `/restapi/cns/nodes/:cnsPath/properties`

Get all property keys for a node.

**Response:**
```json
{
  "keys": ["key1", "key2"]
}
```

#### Set Property

**PUT** `/restapi/cns/nodes/:cnsPath/property`

Set/add property for a node (Admin only).

**Request Body:**
```json
{
  "key": "myProperty",
  "value": "property value",
  "valueType": "STRING_VAR"
}
```

### CNS Validation

#### Check ID

**GET** `/restapi/cns/validation/check-id`

Check if ID is valid CNS ID.

**Query Parameters:**
- `id`: ID to check

**Response:**
```json
{
  "valid": true
}
```

#### Check Name

**POST** `/restapi/cns/validation/check-name`

Check if name is valid CNS display name.

**Request Body:**
```json
{
  "name": {"en_US": "My Name"}
}
```

**Response:**
```json
{
  "result": 0
}
```
(0=valid, -1=incomplete, -2=invalid chars)

#### Check Separator

**GET** `/restapi/cns/validation/check-separator`

Check if separator is valid CNS separator.

**Query Parameters:**
- `separator`: Separator to check

**Response:**
```json
{
  "valid": true
}
```

---

## System

### Get Version Info

**GET** `/restapi/system/version`

Get WinCC OA and API version information.

**Response:**
```json
{
  "api": {
    "version": 1
  },
  "winccoa": {
    "display": "3.19",
    "major": 3,
    "minor": 19,
    "numeric": 319,
    "numeric_full": 31900,
    "patch": 0,
    "platform": "Linux",
    "revision": 0,
    "version": "3.19.0.0"
  }
}
```

### Check Redundancy Active

**GET** `/restapi/system/redundancy/active`

Check if redundancy is currently active.

**Response:**
```json
{
  "active": true
}
```

### Check Redundancy Configured

**GET** `/restapi/system/redundancy/configured`

Check if project is configured as redundant.

**Response:**
```json
{
  "configured": true
}
```

### Get System ID

**GET** `/restapi/system/id`

Get system ID for specified system or current system.

**Query Parameters:**
- `systemName` (optional): Name of the system

**Response:**
```json
{
  "systemId": 1
}
```

### Get System Name

**GET** `/restapi/system/name`

Get system name for specified system ID or current system.

**Query Parameters:**
- `systemId` (optional): System ID

**Response:**
```json
{
  "systemName": "System1"
}
```

---

## Extras

### Set OPC UA Address

**POST** `/restapi/extras/opcua/address`

Set OPC UA address configuration for a data point (Admin only).

**Request Body:**
```json
{
  "datapointName": "TestMe.",
  "driverNumber": 2,
  "addressDirection": 2,
  "addressDataType": 750,
  "serverName": "OpcUaServer",
  "subscriptionName": "Sub1",
  "nodeId": "ns=2;s=MyNode"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200 OK`: Successful request
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Endpoint or resource not found
- `500 Internal Server Error`: Server error

---

## Examples

### Example: Get and Set a Data Point Value

1. **Login:**
```bash
curl -X POST http://localhost:4000/restapi/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-01T13:00:00.000Z"
}
```

2. **Get Value:**
```bash
curl http://localhost:4000/restapi/datapoints/ExampleDP_Arg1.value/value \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Response:
```json
{
  "value": 42.5
}
```

3. **Set Value:**
```bash
curl -X PUT http://localhost:4000/restapi/datapoints/ExampleDP_Arg1.value/value \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"value": 50.0}'
```

Response:
```json
{
  "success": true
}
```

### Example: Search Data Points

```bash
curl "http://localhost:4000/restapi/datapoints?pattern=ExampleDP_*" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Response:
```json
{
  "datapoints": ["ExampleDP_Arg1.", "ExampleDP_Arg2.", "ExampleDP_Float1."]
}
```

### Example: Get Tag History

```bash
curl "http://localhost:4000/restapi/tags/history?dpeNames=ExampleDP_1.value,ExampleDP_2.value&startTime=2024-01-01T00:00:00Z&endTime=2024-01-01T23:59:59Z&limit=100" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Notes

- All URL parameters containing data point names should be URL-encoded
- Timestamps should be in ISO 8601 format (e.g., `2024-01-01T12:00:00Z`)
- The REST API shares authentication tokens with the GraphQL API
- Token expiry time is configurable via the `TOKEN_EXPIRY_MS` environment variable
- Authentication can be disabled for development using `DISABLE_AUTH=true`
