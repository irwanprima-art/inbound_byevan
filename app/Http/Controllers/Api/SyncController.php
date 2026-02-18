<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    private $modelMap = [
        'arrivals' => \App\Models\Arrival::class,
        'transactions' => \App\Models\Transaction::class,
        'vas' => \App\Models\Vas::class,
        'dcc' => \App\Models\Dcc::class,
        'damages' => \App\Models\Damage::class,
        'qc-returns' => \App\Models\QcReturn::class,
        'soh' => \App\Models\Soh::class,
        'locations' => \App\Models\Location::class,
        'attendances' => \App\Models\Attendance::class,
        'employees' => \App\Models\Employee::class,
        'project-productivities' => \App\Models\ProjectProductivity::class,
    ];

    /**
     * Sync (replace all) data for a resource.
     * POST /api/{resource}/sync
     * Body: { "data": [ {...}, {...}, ... ] }
     */
    public function sync(Request $request, string $resource)
    {
        $modelClass = $this->modelMap[$resource] ?? null;
        if (!$modelClass) {
            return response()->json(['error' => 'Unknown resource: ' . $resource], 404);
        }

        $items = $request->input('data', []);

        // Truncate existing data and insert new
        $modelClass::truncate();

        $created = 0;
        foreach ($items as $item) {
            // Remove frontend-only keys
            unset($item['id'], $item['created_at'], $item['updated_at']);
            try {
                $modelClass::create($item);
                $created++;
            } catch (\Exception $e) {
                // Skip invalid records
                \Log::warning("Sync skip record for {$resource}: " . $e->getMessage());
            }
        }

        return response()->json([
            'synced' => $created,
            'total' => count($items),
        ]);
    }
}
