<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Soh;
use Illuminate\Http\Request;

class SohController extends Controller
{
    public function index()
    {
        return response()->json(Soh::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $item = Soh::create($request->all());
        return response()->json($item, 201);
    }

    public function show(Soh $soh)
    {
        return response()->json($soh);
    }

    public function update(Request $request, Soh $soh)
    {
        $soh->update($request->all());
        return response()->json($soh);
    }

    public function destroy(Soh $soh)
    {
        $soh->delete();
        return response()->json(null, 204);
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        Soh::whereIn('id', $ids)->delete();
        return response()->json(['deleted' => count($ids)]);
    }
}
