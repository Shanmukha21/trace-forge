from runtime.pcae.ast_parser import parse_static_facts
from runtime.pcae.cfg_builder import build_control_flow_graph
from runtime.pcae.models import RuntimeProfile
from runtime.pcae.paradigm_detector import detect_algorithmic_paradigm


def test_backtracking_paradigm() -> None:
    code = """
def generate_subsets(nums, index=0, current=[]):
    if index == len(nums):
        print(current)
        return
    generate_subsets(nums, index + 1, current)
    current.append(nums[index])
    generate_subsets(nums, index + 1, current)
    current.pop()
"""
    facts = parse_static_facts(code)
    cfg = build_control_flow_graph(code, facts)
    profile = RuntimeProfile(max_recursive_depth=4)
    res = detect_algorithmic_paradigm(facts, cfg, profile, code)

    assert "Backtracking" in res["paradigm"]


def test_sliding_window_paradigm() -> None:
    code = """
def lengthOfLongestSubstring(s):
    str_set = set()
    l = 0
    res = 0
    for r in range(len(s)):
        while s[r] in str_set:
            str_set.remove(s[l])
            l += 1
        str_set.add(s[r])
        res = max(res, r - l + 1)
    return res
"""
    facts = parse_static_facts(code)
    cfg = build_control_flow_graph(code, facts)
    profile = RuntimeProfile(set_ops=5)
    res = detect_algorithmic_paradigm(facts, cfg, profile, code)

    assert "Sliding Window" in res["paradigm"]


def test_two_pointers_paradigm() -> None:
    code = """
def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
"""
    facts = parse_static_facts(code)
    cfg = build_control_flow_graph(code, facts)
    profile = RuntimeProfile()
    res = detect_algorithmic_paradigm(facts, cfg, profile, code)

    assert (
        "Binary Search" in res["paradigm"]
        or "Divide & Conquer" in res["paradigm"]
    )


if __name__ == "__main__":
    test_backtracking_paradigm()
    test_sliding_window_paradigm()
    test_two_pointers_paradigm()
    print(
        "All Algorithm Strategy Paradigm Classifier unit tests passed successfully!"
    )
