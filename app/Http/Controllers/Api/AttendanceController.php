<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index()
    {
        return response()->json(Attendance::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $item = Attendance::create($request->only([
            'nik', 'name', 'status', 'jobdesc', 'divisi',
            'date', 'clock_in', 'clock_out'
        ]));
        return response()->json($item, 201);
    }

    public function show(Attendance $attendance)
    {
        return response()->json($attendance);
    }

    public function update(Request $request, Attendance $attendance)
    {
        $attendance->update($request->only([
            'nik', 'name', 'status', 'jobdesc', 'divisi',
            'date', 'clock_in', 'clock_out'
        ]));
        return response()->json($attendance);
    }

    public function destroy(Attendance $attendance)
    {
        $attendance->delete();
        return response()->json(null, 204);
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        Attendance::whereIn('id', $ids)->delete();
        return response()->json(['deleted' => count($ids)]);
    }
}
