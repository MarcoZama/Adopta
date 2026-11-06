/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "adoptamanagecommunication": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "Run": {
        "path": "/{connectionId}/triggers/manual/run",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "input",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "object"
          }
        }
      }
    }
  },
  "adoptaschedulecommunication": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "Run": {
        "path": "/{connectionId}/triggers/manual/run",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "input",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "object"
          }
        }
      }
    }
  },
  "vm_adoptaaudiencegroups": {
    "tableId": "",
    "version": "",
    "primaryKey": "vm_adoptaaudiencegroupid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "vm_adoptacommunicationgroups": {
    "tableId": "",
    "version": "",
    "primaryKey": "vm_adoptacommunicationgroupid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "vm_adoptacommunications": {
    "tableId": "",
    "version": "",
    "primaryKey": "vm_adoptacommunicationid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "vm_adoptadeliveries": {
    "tableId": "",
    "version": "",
    "primaryKey": "vm_adoptadeliveryid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "vm_adoptasettings": {
    "tableId": "",
    "version": "",
    "primaryKey": "vm_adoptasettingid",
    "dataSourceType": "Dataverse",
    "apis": {}
  }
};
