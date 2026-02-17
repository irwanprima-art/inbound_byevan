<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dcc', function (Blueprint $table) {
            $table->id();
            $table->string('date')->nullable();
            $table->string('phy_inv')->nullable();
            $table->string('zone')->nullable();
            $table->string('location')->nullable();
            $table->string('owner')->nullable();
            $table->string('sku')->nullable();
            $table->string('brand')->nullable();
            $table->text('description')->nullable();
            $table->integer('sys_qty')->default(0);
            $table->integer('phy_qty')->default(0);
            $table->string('operator')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dcc');
    }
};
