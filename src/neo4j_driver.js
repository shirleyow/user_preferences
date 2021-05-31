"use strict"
// Neo4j Driver Details 
const uri = "bolt://127.0.0.1:7687"
const user = "neo4j"
const password = "12345"
const driver = neo4j.driver(
    uri,
    neo4j.auth.basic(user, password)
)
const userid = 5 // User Fiona Lim in the BBC dataset --> fetched from somewhere