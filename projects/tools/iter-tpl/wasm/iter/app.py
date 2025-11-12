from typing import List
from wit_world import exports
from itertools import combinations, permutations

def make_list(iterable):
    return list(map(list, list(iterable)))

class Tools(exports.Tools):
    def combinations(self, iterable: List[str], r: int) -> List[List[str]]:
        return make_list(combinations(iterable, r))
    def permutations(self, iterable: List[str], r: int) -> List[List[str]]:
        return make_list(permutations(iterable, r))
