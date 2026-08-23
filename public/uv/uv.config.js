/*global Ultraviolet*/
self.__uv$config = {
  prefix: "/~/uv/",
  encodeUrl: function (str) {
    if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
      return Ultraviolet.codec.xor.encode(str);
    }
    if (!str) return "";
    return encodeURIComponent(
      str
        .toString()
        .split("")
        .map(function (char, ind) {
          return ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char;
        })
        .join(""),
    );
  },
  decodeUrl: function (str) {
    if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
      return Ultraviolet.codec.xor.decode(str);
    }
    if (!str) return "";
    var parts = str.split("?");
    var input = parts[0];
    var search = parts.slice(1).join("?");
    try {
      var decodedInput = decodeURIComponent(input);
      var unmasked = decodedInput
        .split("")
        .map(function (char, ind) {
          return ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char;
        })
        .join("");
      return unmasked + (search.length ? "?" + search : "");
    } catch (e) {
      return str;
    }
  },
  handler: "/uv/uv.handler.js",
  client: "/uv/uv.client.js",
  bundle: "/uv/uv.bundle.js",
  config: "/uv/uv.config.js",
  sw: "/uv/uv.sw.js",
};

