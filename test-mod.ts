import { isInappropriateContent } from "./src/lib/moderation";
console.log("github.com/nigger:", isInappropriateContent("github.com/nigger"));
console.log("github.com/ass:", isInappropriateContent("github.com/ass"));
