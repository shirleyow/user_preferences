Due to the time constraint during the internship (this was completed within the last 3 weeks of the internship, amidst presentations), there are a number of areas of improvement / loopholes in this web-app. 

1. **Entity side labels** - There may be entities with the same name but different labels (e.g. ORG and LOC) in the entities extracted from spaCy. The Entities Pie Chart and the Search by Entity Name features do not take into consideration the labels yet. 
2. **Validation for the graph's search bar** - Currently, the Cypher codes are set to only search for the documents/entities/topics that are read by the user, with capitalisation taken into account. Incorrect input in the search bar will render an erroneous graph output, since there is currently no validation for the search inputs.
3. There is also a **bug in the Neo4j graph embedded** and it can be triggered in the following way: If any Document node in the graph is EXPANDED, and subsequently the graph is RESETTED, the resetted graph encounters an error when trying to expand a Document node again. Currently, this bug is simply avoided by resetting the graph to a non-expandable graph if any Document node in the previous graph was expanded.
4. In addition, **direct connection to the Neo4j database can be insecure**. 
5. Currently the libraries are included in the <script> tags in index.html, thus would require <b>Internet connection</b> for the web-app to work properly. The libraries can be installed using npm to work offline. 