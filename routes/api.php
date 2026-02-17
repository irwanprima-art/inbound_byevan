<?php

use App\Http\Controllers\Api\ArrivalController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\VasController;
use App\Http\Controllers\Api\DccController;
use App\Http\Controllers\Api\DamageController;
use App\Http\Controllers\Api\QcReturnController;
use App\Http\Controllers\Api\SohController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\ProjectProductivityController;
use Illuminate\Support\Facades\Route;

// Arrivals
Route::apiResource('arrivals', ArrivalController::class);
Route::post('arrivals/bulk-delete', [ArrivalController::class, 'bulkDelete']);

// Transactions
Route::apiResource('transactions', TransactionController::class);
Route::post('transactions/bulk-delete', [TransactionController::class, 'bulkDelete']);

// VAS
Route::apiResource('vas', VasController::class);
Route::post('vas/bulk-delete', [VasController::class, 'bulkDelete']);

// DCC
Route::apiResource('dcc', DccController::class);
Route::post('dcc/bulk-delete', [DccController::class, 'bulkDelete']);

// Damages
Route::apiResource('damages', DamageController::class);
Route::post('damages/bulk-delete', [DamageController::class, 'bulkDelete']);

// QC Returns
Route::apiResource('qc-returns', QcReturnController::class);
Route::post('qc-returns/bulk-delete', [QcReturnController::class, 'bulkDelete']);

// SOH
Route::apiResource('soh', SohController::class);
Route::post('soh/bulk-delete', [SohController::class, 'bulkDelete']);

// Locations
Route::apiResource('locations', LocationController::class);
Route::post('locations/bulk-delete', [LocationController::class, 'bulkDelete']);

// Attendance
Route::apiResource('attendances', AttendanceController::class);
Route::post('attendances/bulk-delete', [AttendanceController::class, 'bulkDelete']);

// Employees
Route::apiResource('employees', EmployeeController::class);
Route::post('employees/bulk-delete', [EmployeeController::class, 'bulkDelete']);

// Project Productivity
Route::apiResource('project-productivities', ProjectProductivityController::class);
Route::post('project-productivities/bulk-delete', [ProjectProductivityController::class, 'bulkDelete']);
