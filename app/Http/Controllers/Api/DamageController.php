<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Damage;
use Illuminate\Http\Request;

class DamageController extends Controller
{
    public function index()
    {
        return response()->json(Damage::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $item = Damage::create($request->only([
            'date', 'brand', 'sku', 'qty', 'note', 'reason', 'operator', 'qc_by'
        ]));
        return response()->json($item, 201);
    }

    public function show(Damage $damage)
    {
        return response()->json($damage);
    }

    public function update(Request $request, Damage $damage)
    {
        $damage->update($request->only([
            'date', 'brand', 'sku', 'qty', 'note', 'reason', 'operator', 'qc_by'
        ]));
        return response()->json($damage);
    }

    public function destroy(Damage $damage)
    {
        $damage->delete();
        return response()->json(null, 204);
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        Damage::whereIn('id', $ids)->delete();
        return response()->json(['deleted' => count($ids)]);
    }
}
