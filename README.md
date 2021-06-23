# Personalised User Profile
Tech Stack: JavaScript, jQuery, HTML, CSS, Bootstrap
<br>


## How To Run Web-App
Neo4j has to be installed. Internet connection required as well as packages are not installed. 
<ol>
  <li>To change Neo4j Settings / neo4j.conf to as follows:</li>
  
  - Include this: apoc.export.file.enabled=true<br>
  - Include this too: apoc.import.file.use_neo4j_config=false
  
  <li>Restore database in Neo4j</li>
  
  - Stop the Neo4j database from running and run the following commands in its terminal:<br>
  
  ```
  cd bin
  neo4j-admin load --from=jun23.dump --database=neo4j --force
  ```
  - Note to copy the jun23.dump file from the `neo4j_dumps` folder in Assets to the `bin` folder in your Neo4j database.
  
  <li>Run web-app on LocalHost</li>
  
  - Can use npm's http-server to run the web-app on LocalHost
  ```
  npm install http-server -g
  cd <directory of user_preferences folder>
  http-server
  ```
  
  <li>Open http://localhost:8080/dist/ on a browser.</li>
</ol>

<h2>Relevant Jupyter Notebooks:</h2>
<ul>
  <li>
    Topic Modelling (LDA Mallet Model): https://colab.research.google.com/drive/1yxgrteoSSXNdYhyobdL70jCTViWU8j1Z?usp=sharing
  </li>
  <li>(List to be continued)</li>
</ul>
