<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('soh', function (Blueprint $table) {
            $table->id();
            $table->string('location')->nullable();
            $table->string('sku')->nullable();
            $table->string('sku_category')->nullable();
            $table->string('sku_brand')->nullable();
            $table->string('zone')->nullable();
            $table->string('location_type')->nullable();
            $table->string('owner')->nullable();
            $table->string('status')->nullable();
            $table->integer('qty')->default(0);
            $table->string('wh_arrival_date')->nullable();
            $table->string('receipt_no')->nullable();
            $table->string('mfg_date')->nullable();
            $table->string('exp_date')->nullable();
            $table->string('batch_no')->nullable();
            $table->string('update_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('soh');
    }
};
