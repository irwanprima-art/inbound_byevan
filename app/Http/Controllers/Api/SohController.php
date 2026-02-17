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
        $item = Soh::create($request->only([
            'location', 'sku', 'sku_category', 'sku_brand', 'zone',
            'location_type', 'owner', 'status', 'qty',
            'wh_arrival_date', 'receipt_no', 'mfg_date', 'exp_date',
            'batch_no', 'update_date'
        ]));
        return response()->json($item, 201);
    }

    public function show(Soh $soh)
    {
        return response()->json($soh);
    }

    public function update(Request $request, Soh $soh)
    {
        $soh->update($request->only([
            'location', 'sku', 'sku_category', 'sku_brand', 'zone',
            'location_type', 'owner', 'status', 'qty',
            'wh_arrival_date', 'receipt_no', 'mfg_date', 'exp_date',
            'batch_no', 'update_date'
        ]));
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
