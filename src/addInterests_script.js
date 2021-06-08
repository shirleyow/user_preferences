// Display the buttons Update / Add only if at least 1 is selected.

// Neo4j DB
const session4 = driver.session() // Create new session for simultaneous running of sessions. Will still have to run session to count the number of recent documents read.
var all_non_existing_topics = []
var all_non_existing_entities = []
var to_add_topics = []
var to_add_entities = []

const prep = async function () {
   await setup(userid)
   // Return all topics and entities that are not currently in user's existing preferences - in top_topics and top_entities.
   try {
      await session4.run("MATCH (n) WHERE ('Entity' IN labels(n) OR 'Topic' IN labels(n)) RETURN n.Name AS entity, labels(n)[1..][0] AS ent_label, n.TopicID AS topic, n.words AS topic_words")
         .then(result => {
            var topics = Object.keys(top_topics)
            var entities = Object.keys(top_entities)
            result.records.filter(r => ((r.get('topic') && !topics.includes(r.get('topic').toString())) || (r.get('entity') && !entities.includes(r.get('entity')))))
               .forEach(record => {
                  if (record.get('topic')) all_non_existing_topics.push({ 'label': "Topic " + record.get('topic').toString() + ": " + record.get('topic_words').join(", "), 'value': record.get('topic').toString() })
                  else all_non_existing_entities.push({ 'label': record.get('entity') + " - " + record.get('ent_label'), 'value': record.get('entity'), 'sidelab': record.get('ent_label') })
               });
         })
   } finally {
      // Add the suggested pills
      suggested_topics.forEach(o => $("#suggested_values").append("<span class='pill suggested' category='topic' value='" + o.val + "' onclick='pressPill(this)'>" + "Topic " + o.val.toString() + ": " + o.words.join(", ") + "</span>"))
      suggested_entities.forEach(o => $("#suggested_values").append("<span class='pill suggested' category='entity' sidelab='" + o.sidelab + "' value='" + o.val + "' onclick='pressPill(this)'>" + o.val + " - " + o.sidelab + "</span>"))
      // Show the current preferences
      await session4.run("MATCH (u:User{UserID:$userid}) RETURN u.liked_tops+u.liked_ents AS likes, u.disliked_tops+u.disliked_ents AS dislikes", { userid: userid }).then(result => {
         var likes = result.records[0].get('likes')
         var dislikes = result.records[0].get('dislikes')
         likes.forEach(l => $('#showmore').append("<li class='list-group-item'>" + (Number.isInteger(l) ? "Topic " + l : l) + "</li>"))
         dislikes.forEach(d => $('#showless').append("<li class='list-group-item'>" + (Number.isInteger(d) ? "Topic " + d : d) + "</li>"))
      })
      autocomplete({
         input: document.getElementById("search_new"),
         fetch: function (text, update) {
            text = text.toLowerCase();
            var suggestions = all_non_existing_topics.filter(n => n.label.toLowerCase().includes(text) && to_add_topics.indexOf(parseInt(n.value)) == -1 && suggested_topics.map(o => o.val.toString()).indexOf(n.value) == -1)
            suggestions = suggestions.concat(all_non_existing_entities.filter(n => n.label.toLowerCase().startsWith(text) && to_add_entities.indexOf(n.value + " (" + n.sidelab + ")") == -1 && suggested_entities.map(o => o.val + o.sidelab).indexOf(n.value + n.sidelab) == -1).sort((a, b) => a.label.length - b.label.length))
            update(suggestions);
         },
         onSelect: function (item) {
            document.getElementById("search_new").value = "";
            if (item.label.includes("Topic")) {
               to_add_topics.push(parseInt(item.value))
               $("#selected_values").append("<span class='pill selected' category='topic' value='" + item.value + "' onclick='pressPill(this)'>" + item.label + "</span>")
            }
            else {
               to_add_entities.push(item.value + " (" + item.sidelab + ")")
               $("#selected_values").append("<span class='pill selected' category='entity' sidelab='" + item.sidelab + "' value='" + item.value + "' onclick='pressPill(this)'>" + item.label + "</span>")
            }
         }
      });
   }
}

prep()

function pressPill(ele) {
   if (ele.className.includes('selected')) {
      if (ele.getAttribute("category") == 'topic') to_add_topics = to_add_topics.filter(t => t != ele.getAttribute("value")) // remove val from to_add_topics
      else to_add_entities = to_add_entities.filter(e => e != (ele.getAttribute("value") + " (" + ele.getAttribute("sidelab") + ")")) // remove val from to_add_entities
      if (ele.className.includes('suggested')) {
         ele.classList.remove('selected')
      } else {
         ele.remove()
      }
   } else {
      ele.className += ' selected'
      if (ele.getAttribute('category') == 'topic') to_add_topics.push(parseInt(ele.getAttribute('value')))
      else to_add_entities.push(ele.getAttribute('value') + " (" + ele.getAttribute('sidelab') + ")")
   }
}

async function addToLikedItems() {
   // Updating the neo4j data would require you to recreate the bbc_data gds graph!
   try {
      await session4.run("CALL gds.graph.drop('bbc_recs')")
   } finally {
      try {
         // Change weights 
         await session4.run("MATCH (t:Topic)-[r]-(d:Document)-[:READ_BY]->(u:User{UserID:$userid}) WHERE t.TopicID IN $to_add_topics SET r.weight=4", { userid: userid, to_add_topics: to_add_topics })
         await session4.run("MATCH (e:Entity)-[r]-(d:Document)-[:READ_BY]->(u:User{UserID:$userid}) WHERE e.Name+' ('+labels(e)[1..][0]+')' IN $to_add_entities SET r.weight=2", { userid: userid, to_add_entities: to_add_entities })
         await session4.run("MATCH (u:User{UserID:$userid}) SET u.liked_tops=u.liked_tops+$to_add_topics, u.liked_ents=u.liked_ents+$to_add_entities", { userid: userid, to_add_entities:to_add_entities, to_add_topics:to_add_topics })
         // need to also remove topics/entities disliked from the user's liked topics and entities if present
         await session4.run("MATCH (u:User{UserID:$userid}) SET u.disliked_tops=[t IN u.disliked_tops WHERE NOT t IN u.liked_tops], u.disliked_ents=[e IN u.disliked_ents WHERE NOT e IN u.liked_ents]", { userid: userid })
         // Can also add the liked topics/entities that are not connected to the user to the list of source nodes when computing the pagerank scores.
         // This is done in highcharts_script.js, but effects might be too strong.
      } finally {
         init()
         prep() // includes await setup(userid) and start(userid)
         location.reload()
      }
   }
}