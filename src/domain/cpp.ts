export const CPP_STANDARDS = ['c++98', 'c++11', 'c++14', 'c++17', 'c++20', 'c++23'] as const;

export type CppStandard = (typeof CPP_STANDARDS)[number];

export const DEFAULT_CPP_STANDARD: CppStandard = 'c++17';
