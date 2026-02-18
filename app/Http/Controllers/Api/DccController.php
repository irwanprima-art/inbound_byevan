<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dcc;
use Illuminate\Http\Request;

class DccController extends Controller
{
    public function index()
    {
        return response()->json(Dcc::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $item = Dcc::create($request->all());
        return response()->json($item, 201);
    }

    public function show(Dcc $dcc)
    {
        return response()->json($dcc);
    }

    public function update(Request $request, Dcc $dcc)
    {
        $dcc->update($request->all());
        return response()->json($dcc);
    }

    public function destroy(Dcc $dcc)
    {
        $dcc->delete();
        return response()->json(null, 204);
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        Dcc::whereIn('id', $ids)->delete();
        return response()->json(['deleted' => count($ids)]);
    }
}
