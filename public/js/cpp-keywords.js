
const CPP_KEYWORDS = [
    "alignas", "alignof", "and", "and_eq", "asm", "auto", "bitand", "bitor", 
    "bool", "break", "case", "catch", "char", "char8_t", "char16_t", "char32_t", 
    "class", "compl", "concept", "const", "consteval", "constexpr", "constinit", 
    "const_cast", "continue", "co_await", "co_return", "co_yield", "decltype", 
    "default", "delete", "do", "double", "dynamic_cast", "else", "enum", "explicit", 
    "export", "extern", "false", "float", "for", "friend", "goto", "if", "inline", 
    "int", "long", "mutable", "namespace", "new", "noexcept", "not", "not_eq", 
    "nullptr", "operator", "or", "or_eq", "private", "protected", "public", 
    "register", "reinterpret_cast", "requires", "return", "short", "signed", 
    "sizeof", "static", "static_assert", "static_cast", "struct", "switch", 
    "template", "this", "thread_local", "throw", "true", "try", "typedef", 
    "typeid", "typename", "union", "unsigned", "using", "virtual", "void", 
    "volatile", "wchar_t", "while", "xor", "xor_eq",

    "#include", "#define", "#undef", "#ifdef", "#ifndef", "#if", "#else", "#elif", 
    "#endif", "#error", "#pragma", "#line",

    "<iostream>", "<string>", "<vector>", "<map>", "<algorithm>", "<cmath>", 
    "<fstream>", "<sstream>", "<memory>", "<cstdlib>", "<ctime>", "<cstdio>", 
    "<cstring>", "<stdexcept>", "<functional>", "<utility>", "<array>", "<deque>", 
    "<forward_list>", "<list>", "<set>", "<unordered_map>", "<unordered_set>", 
    "<stack>", "<queue>", "<chrono>", "<random>", "<regex>", "<thread>", "<mutex>",

    "std", "std::", "std::string", "std::vector", "std::map", "std::cout", "std::cin", 
    "std::endl", "std::pair", "std::make_pair", "std::shared_ptr", "std::unique_ptr", 
    "std::function", "std::bind", "std::move", "std::forward", "std::to_string",
    "std::stoi", "std::stod", "std::min", "std::max", "std::sort", "std::find",
    "std::begin", "std::end", "std::distance", "std::transform", "std::for_each",
    
    "sort", "find", "find_if", "binary_search", "count", "count_if", "copy", 
    "copy_if", "replace", "replace_if", "transform", "accumulate", "for_each", 
    "generate", "generate_n", "fill", "fill_n", "reverse", "rotate", "shuffle", 
    "partition", "stable_partition", "merge", "unique", "remove", "remove_if"
];

const CPP_SNIPPETS = [
    {
        text: "for (int i = 0; i < n; i++) {\n    \n}",
        displayText: "for loop with int i"
    },
    {
        text: "while (condition) {\n    \n}",
        displayText: "while loop"
    },
    {
        text: "if (condition) {\n    \n} else {\n    \n}",
        displayText: "if-else statement"
    },
    {
        text: "switch (variable) {\n    case value1:\n        // code\n        break;\n    case value2:\n        // code\n        break;\n    default:\n        // code\n        break;\n}",
        displayText: "switch statement"
    },
    {
        text: "class ClassName {\nprivate:\n    // private members\npublic:\n    // public members\n    ClassName() {\n        // constructor\n    }\n    ~ClassName() {\n        // destructor\n    }\n};",
        displayText: "class definition"
    },
    {
        text: "struct StructName {\n    // members\n};",
        displayText: "struct definition"
    },
    {
        text: "template <typename T>\n",
        displayText: "template declaration"
    },
    {
        text: "try {\n    // code that might throw\n} catch (std::exception& e) {\n    // handle exception\n}",
        displayText: "try-catch block"
    },
    {
        text: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}",
        displayText: "main function template"
    },
    {
        text: "std::vector<type> name;",
        displayText: "std::vector declaration"
    },
    {
        text: "std::map<keyType, valueType> name;",
        displayText: "std::map declaration"
    }
];

CodeMirror.registerHelper("hint", "text/x-c++src", function(editor, options) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    let start = cursor.ch;
    let end = cursor.ch;
    
    while (start > 0 && /[\w\.:>]/.test(line.charAt(start - 1))) {
        start--;
    }
    
    const currentWord = line.slice(start, end);
    const list = [];
    
    for (let i = 0; i < CPP_KEYWORDS.length; i++) {
        const keyword = CPP_KEYWORDS[i];
        if (keyword.indexOf(currentWord) === 0) {
            list.push(keyword);
        }
    }
    
    if (start === cursor.ch && cursor.ch === 0) {
        for (let i = 0; i < CPP_SNIPPETS.length; i++) {
            list.push(CPP_SNIPPETS[i]);
        }
    }
    
    const otherWords = {};
    const doc = editor.getDoc();
    const content = doc.getValue();
    const wordRegex = /[\w$]+/g;
    let match;
    
    while ((match = wordRegex.exec(content))) {
        const word = match[0];
        if (word.length > 3 && !otherWords[word] && word.indexOf(currentWord) === 0) {
            otherWords[word] = true;
            list.push(word);
        }
    }
    
    return {
        list: list,
        from: CodeMirror.Pos(cursor.line, start),
        to: CodeMirror.Pos(cursor.line, end)
    };
}); 