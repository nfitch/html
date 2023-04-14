/*
  Parses v0.  Simple list of lists.  Making this future compatible for easy
  imports when mucking with JSON manually.
  {
    version: 0,
    data: [
       ['a1', 'a2', ...],
       ...
    ]
  }
  Parses v1.  This is future-proof to add more data at each level (for example,
  recording the width % of each list so we can have some wider than others).
  {
    version: 1,
    lists: [
      {
        id: "...",
        data: "<header>",
        elements: [
          { id: "...", data: "..." },
          ...
        ]
      }
    ]
  }

  All parsers result in a structure like the latest one... that's what the
  dataFromObject in lists.js expects.
 */
function createListParser(root) {
    var parsers = {
        0: parsev0,
        1: parsev1
    };

    var testData = {
        version: 1,
        lists: [
            {
                id: "id1",
                data: "header1",
                elements: [
                    { id: "eid1", data: "foo" },
                    { id: "eid2", data: "bar" },
                    { id: "eid3", data: "baz" },
                    { id: "eid4", data: "bang" }
                ]
            },
            {
                id: "id2",
                data: "header2",
                elements: [
                    { id: "eida", data: "boom" },
                    { id: "eidb", data: "babamb" },
                    { id: "eidc", data: "shock" },
                    { id: "eidd", data: "hadukin" }
                ]
            }
        ]
    };

    function parse(dataString) {
        var data;
        try {
            data = JSON.parse(dataString);
        } catch (e) {
            console.error("Error parsing data string as JSON.",
                          dataString,
                          e);
            return false;
        }
        if (!data.hasOwnProperty("version")) {
            data = mutateNotVersioned(data);
        }
        if (!parsers[data.version]) {
            console.error("No parser for data object.  Bailing...",
                          dataString,
                          data);
            return false;
        }
        return parsers[data.version](data);
    }

    //First version looked like this:
    // [ {"elements": ["x", ...] }, ...]
    //
    //Also supports:
    // [["x", ...], ...]
    function mutateNotVersioned(data) {
        //It's easiest just to pull it into a version 0 wrapper.
        var lists = [];
        for (var i = 0; i < data.length; ++i) {
            if (Array.isArray(data[i])) {
                lists.push(data[i]);
            } else {
                lists.push(data[i].elements);
            }
        }
        return {
            "version": 0,
            "lists": lists
        };
    }

    //Stringify to the latest structure.
    function stringify() {
        //TODO: Extract all the other fields from the dom overlay
        var data = {
            version: 1,
            lists: []
        };
        for (var i = 0; i < root.children.length; ++i) {
            var dlist = { "elements": [] };
            var elements = root.children[i];
            for (var j = 0; j < elements.children.length; ++j) {
                var t = elements.children[j].innerText;
                if (t !== "") {
                    dlist.elements.push({ "data": t });
                }
            }
            if (dlist.elements.length > 0) {
                data.lists.push(dlist);
            }
        }
        return JSON.stringify(data);
    }

    function parsev0(data) {
        //This is simply a list of lists, we need to slot the right
        // things in the right places...
        var newData = {
            "version": "v0->v1",
            "lists": []
        }
        for (var i = 0; i < data.lists.length; ++i) {
            var newList = { "elements": [] };
            var elements = data.lists[i];
            for (var j = 0; j < elements.length; ++j) {
                newList.elements.push({ "data": elements[j] });
            }
            newData.lists.push(newList);
        }
        return newData;
    }

    //Latest is a passthrough.
    function parsev1(data) {
        return data;
    }

    return {
        parse,
        stringify
    };
}

export { createListParser };
window.createListParser = createListParser;
