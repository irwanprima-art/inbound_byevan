<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qc_returns', function (Blueprint $table) {
            $table->id();
            $table->string('date')->nullable();
            $table->string('receipt')->nullable();
            $table->string('return_date')->nullable();
            $table->string('brand')->nullable();
            $table->string('owner')->nullable();
            $table->string('sku')->nullable();
            $table->integer('qty')->default(0);
            $table->string('from_loc')->nullable();
            $table->string('to_loc')->nullable();
            $table->string('operator')->nullable();
            $table->string('status')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qc_returns');
    }
};
