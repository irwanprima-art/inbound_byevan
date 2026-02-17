<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index()
    {
        return response()->json(Employee::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $item = Employee::create($request->only(['nik', 'name', 'status']));
        return response()->json($item, 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee);
    }

    public function update(Request $request, Employee $employee)
    {
        $employee->update($request->only(['nik', 'name', 'status']));
        return response()->json($employee);
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json(null, 204);
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        Employee::whereIn('id', $ids)->delete();
        return response()->json(['deleted' => count($ids)]);
    }
}
