<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('damages', function (Blueprint $table) {
            $table->id();
            $table->string('date')->nullable();
            $table->string('brand')->nullable();
            $table->string('sku')->nullable();
            $table->integer('qty')->default(0);
            $table->text('note')->nullable();
            $table->string('reason')->nullable();
            $table->string('operator')->nullable();
            $table->string('qc_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('damages');
    }
};
