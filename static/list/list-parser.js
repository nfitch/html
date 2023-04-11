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
  dataFromObject is going to expect.
 */
function createListParser() {
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
        //TODO
        return testData;
    }

    function stringify(root) {
        //TODO
        return JSON.stringify(testData);
    }

    return {
        parse,
        stringify
    };
}

export { createListParser };
window.createListParser = createListParser;
