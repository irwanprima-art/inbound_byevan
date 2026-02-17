<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QcReturn;
use Illuminate\Http\Request;

class QcReturnController extends Controller
{
    public function index()
    {
        return response()->json(QcReturn::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $item = QcReturn::create($request->only([
            'date', 'receipt', 'return_date', 'brand', 'owner', 'sku',
            'qty', 'from_loc', 'to_loc', 'operator', 'status'
        ]));
        return response()->json($item, 201);
    }

    public function show(QcReturn $qcReturn)
    {
        return response()->json($qcReturn);
    }

    public function update(Request $request, QcReturn $qcReturn)
    {
        $qcReturn->update($request->only([
            'date', 'receipt', 'return_date', 'brand', 'owner', 'sku',
            'qty', 'from_loc', 'to_loc', 'operator', 'status'
        ]));
        return response()->json($qcReturn);
    }

    public function destroy(QcReturn $qcReturn)
    {
        $qcReturn->delete();
        return response()->json(null, 204);
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        QcReturn::whereIn('id', $ids)->delete();
        return response()->json(['deleted' => count($ids)]);
    }
}
