//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

const username = process.env.USER_NAME;
const password = process.env.PASSWORD;

mongoose.connect("mongodb+srv://" + username + ":" + password + "@cluster0.rzwys.mongodb.net/todolistDB?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// mongoose.connect("mongodb://localhost:27017/userDB", {
//   useNewUrlParser: true
// });

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);


const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

// adding list namse to Groups in Navbar
function titleNames() {

  return new Promise(function(resolve, reject) {
    List.find({}, {
      _id: 0,
      name: 1
    }, function(err, foundListTitleNames) {
      if (!err) {
        resolve(foundListTitleNames);
      }
    });
  });

}

// get the Today to do list
app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {

    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully savevd default items to DB.");
        }
      });
      res.redirect("/");
    } else {
      //testfunc();
      titleNames().then(function(listTitleNames) {
        res.render("list", {
          listTitle: "Today",
          newListItems: foundItems,
          listTitleNames: listTitleNames
        });
      }).catch(function() {
        console.log("there is errror");
      });

    }
  });

});

// add or get to do List name
app.get("/:customListName", function(req, res) {
  let customListName = _.capitalize(req.params.customListName);
  // console.log(customListName);
  if (customListName === "Favicon.ico") { // deleting unwanted data to mongodb. ??????
    customListName = "";
  }
  //console.log(customListName);

  List.findOne({
    name: customListName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        //Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //Show an existing list
        titleNames().then(function(listTitleNames) {
          res.render("list", {
            listTitle: foundList.name,
            newListItems: foundList.items,
            listTitleNames: listTitleNames
          });
        }).catch(function() {
          console.log("there is errror");
        });

      }
    }
  });



});


// adding to do items with button "+"
app.post("/", function(req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({
      name: listName
    }, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});


// delete item
app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate({
      name: listName
    }, {
      $pull: {
        items: {
          _id: checkedItemId
        }
      }
    }, function(err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }


});

// adding new custom list name with add new group
app.post("/addgroup", function(req, res) {

  const customListName = req.body.customListName;
  res.redirect("/" + customListName);

});

// deleting group
app.post("/remove-group", function(req, res) {
  const title = req.body.title;

  if (title === "Today") { // deleting Just Today List from "/".
    Item.deleteMany({}, function(err) {
      if (!err) {
        console.log("deleted today list.");
        res.redirect("/");
      }
    });
  } else { // deleting othe groups

    List.deleteOne({
      name: title
    }, function(err) {
      if (!err) {
        console.log("successfully deleted Group.");
        res.redirect("/");
      }
    });

  }

});


////////// runing server///////////////
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully.");
});
