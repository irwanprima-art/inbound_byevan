<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectProductivity;
use Illuminate\Http\Request;

class ProjectProductivityController extends Controller
{
    public function index()
    {
        return response()->json(ProjectProductivity::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $item = ProjectProductivity::create($request->all());
        return response()->json($item, 201);
    }

    public function show(ProjectProductivity $projectProductivity)
    {
        return response()->json($projectProductivity);
    }

    public function update(Request $request, ProjectProductivity $projectProductivity)
    {
        $projectProductivity->update($request->all());
        return response()->json($projectProductivity);
    }

    public function destroy(ProjectProductivity $projectProductivity)
    {
        $projectProductivity->delete();
        return response()->json(null, 204);
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        ProjectProductivity::whereIn('id', $ids)->delete();
        return response()->json(['deleted' => count($ids)]);
    }
}
