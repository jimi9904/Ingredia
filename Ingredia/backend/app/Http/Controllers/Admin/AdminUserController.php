<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = User::query();
        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->string('email') . '%');
        }
        $users = $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 20));
        $items = collect($users->items())->map(fn($u) => ['id' => (string) $u->_id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role, 'created_at' => $u->created_at, 'verified' => !is_null($u->email_verified_at)]);
        return response()->json(['success' => true, 'data' => $items, 'meta' => ['total' => $users->total(), 'page' => $users->currentPage(), 'per_page' => $users->perPage()]]);
    }

    public function show(string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $stats = [
            'reviews_written' => \App\Models\Review::where('user_id', $id)->count(),
            'recipes_saved'   => \App\Models\SavedCollection::where('user_id', $id)->sum(fn($c) => count($c->recipe_ids ?? [])),
        ];
        return $this->success(['id' => (string) $user->_id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role, 'preferences' => $user->preferences, 'created_at' => $user->created_at, 'stats' => $stats]);
    }

    public function updateRole(Request $request, string $id): JsonResponse
    {
        $request->validate(['role' => 'required|in:user,admin']);
        $user = User::findOrFail($id);
        $user->role = $request->string('role');
        $user->save();
        return $this->success(null, 'User role updated.');
    }
}
