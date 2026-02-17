<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_productivities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('task')->nullable();
            $table->integer('qty')->default(0);
            $table->string('date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_productivities');
    }
};
