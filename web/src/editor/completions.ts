import { snippetCompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';

const KEYWORDS = [
  'alignas', 'alignof', 'auto', 'break', 'case', 'catch', 'class', 'const', 'consteval', 'constexpr',
  'constinit', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do',
  'else', 'enum', 'explicit', 'export', 'extern', 'false', 'final', 'for', 'friend', 'goto', 'if',
  'inline', 'mutable', 'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'override', 'private',
  'protected', 'public', 'return', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch',
  'template', 'this', 'throw', 'true', 'try', 'typedef', 'typename', 'union', 'using', 'virtual',
  'volatile', 'while', 'dynamic_cast', 'reinterpret_cast', 'const_cast', 'requires', 'concept',
];

const TYPES = [
  'bool', 'char', 'char8_t', 'char16_t', 'char32_t', 'double', 'float', 'int', 'long', 'short',
  'signed', 'unsigned', 'void', 'size_t', 'int64_t', 'uint64_t', 'int32_t', 'uint32_t',
];

const LIBRARY = [
  'std::cin', 'std::cout', 'std::cerr', 'std::endl', 'std::string', 'std::string_view', 'std::vector',
  'std::array', 'std::map', 'std::unordered_map', 'std::set', 'std::unordered_set', 'std::pair',
  'std::tuple', 'std::queue', 'std::priority_queue', 'std::stack', 'std::deque', 'std::optional',
  'std::variant', 'std::sort', 'std::reverse', 'std::accumulate', 'std::max', 'std::min', 'std::swap',
  'std::lower_bound', 'std::upper_bound', 'std::make_pair', 'std::move', 'std::unique_ptr',
  'std::shared_ptr', 'std::make_unique', 'std::make_shared', 'std::getline', 'std::to_string',
  'std::ios::sync_with_stdio',
];

const HEADERS = [
  'algorithm', 'array', 'bitset', 'chrono', 'cmath', 'cstdint', 'cstdio', 'cstring', 'deque',
  'functional', 'iomanip', 'iostream', 'iterator', 'limits', 'list', 'map', 'memory', 'numeric',
  'optional', 'queue', 'random', 'set', 'sstream', 'stack', 'string', 'string_view', 'tuple',
  'unordered_map', 'unordered_set', 'utility', 'variant', 'vector', 'bits/stdc++.h',
];

const SNIPPETS: Completion[] = [
  snippetCompletion('for (int ${i} = 0; ${i} < ${n}; ++${i}) {\n\t${}\n}', {
    label: 'for',
    detail: 'counted loop',
    type: 'keyword',
    boost: 2,
  }),
  snippetCompletion('for (const auto& ${item} : ${range}) {\n\t${}\n}', {
    label: 'forr',
    detail: 'range-based for',
    type: 'keyword',
  }),
  snippetCompletion('int main() {\n\t${}\n\treturn 0;\n}', {
    label: 'main',
    detail: 'entry point',
    type: 'function',
  }),
  snippetCompletion('std::ios::sync_with_stdio(false);\nstd::cin.tie(nullptr);\n${}', {
    label: 'fastio',
    detail: 'fast iostreams',
    type: 'text',
  }),
];

const WORD_OPTIONS: Completion[] = [
  ...KEYWORDS.map((label) => ({ label, type: 'keyword' })),
  ...TYPES.map((label) => ({ label, type: 'type' })),
  ...LIBRARY.map((label) => ({ label, type: 'function' })),
  ...SNIPPETS,
];

const HEADER_OPTIONS: Completion[] = HEADERS.map((label) => ({ label, type: 'namespace' }));

export function cppCompletions(context: CompletionContext): CompletionResult | null {
  const include = context.matchBefore(/#include\s*<[\w./+]*/);
  if (include) {
    const start = include.text.indexOf('<') + 1;
    return { from: include.from + start, options: HEADER_OPTIONS, validFor: /^[\w./+]*$/ };
  }

  const word = context.matchBefore(/[\w:]+/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  return { from: word.from, options: WORD_OPTIONS, validFor: /^[\w:]*$/ };
}
