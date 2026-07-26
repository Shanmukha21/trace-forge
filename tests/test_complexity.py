from runtime.complexity_analyzer import analyze_code_structure


def test_linear_search_complexity() -> None:
    code = """
def linear_search(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1
"""
    result = analyze_code_structure(code)
    assert result["max_loop_depth"] == 1
    assert result["estimated_time_complexity"] == "O(N)"
    assert result["estimated_space_complexity"] == "O(1)"


def test_two_sum_hash_map_complexity() -> None:
    code = """
def custom_two_sum(nums, target):
    seen = {}
    for i in range(len(nums)):
        diff = target - nums[i]
        if diff in seen:
            return [seen[diff], i]
        seen[nums[i]] = i
    return []
"""
    result = analyze_code_structure(code)
    assert result["max_loop_depth"] == 1
    assert result["has_dict_allocation"] is True
    assert result["estimated_time_complexity"] == "O(N)"
    assert result["estimated_space_complexity"] == "O(N)"


def test_nested_loops_complexity() -> None:
    code = """
def custom_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n):
            if arr[i] < arr[j]:
                arr[i], arr[j] = arr[j], arr[i]
"""
    result = analyze_code_structure(code)
    assert result["max_loop_depth"] == 2
    assert result["estimated_time_complexity"] == "O(N²)"


def test_triple_nested_loops_complexity() -> None:
    code = """
def matrix_multiply(a, b, c):
    for i in range(len(a)):
        for j in range(len(b)):
            for k in range(len(c)):
                print(i, j, k)
"""
    result = analyze_code_structure(code)
    assert result["max_loop_depth"] == 3
    assert result["estimated_time_complexity"] == "O(N^3)"


def test_binary_search_complexity() -> None:
    code = """
def search(arr, target):
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
    result = analyze_code_structure(code)
    assert result["max_loop_depth"] == 1
    assert result["has_logarithmic_step"] is True
    assert result["estimated_time_complexity"] == "O(log N)"


def test_recursive_fibonacci_complexity() -> None:
    code = """
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
"""
    result = analyze_code_structure(code)
    assert result["recursive_calls_count"] == 2
    assert result["estimated_time_complexity"] == "O(2ᴺ)"


if __name__ == "__main__":
    test_linear_search_complexity()
    test_two_sum_hash_map_complexity()
    test_nested_loops_complexity()
    test_triple_nested_loops_complexity()
    test_binary_search_complexity()
    test_recursive_fibonacci_complexity()
    print("All AST complexity structural tests passed successfully!")

