<?php

namespace App\Http\Controllers;

use App\Http\Requests\CastVoteRequest;
use App\Services\VoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VotesController extends Controller
{
    public function __construct(private VoteService $votes) {}

    public function hasVoted(Request $request, string $electionId): JsonResponse
    {
        $user = $request->user();
        $round = $request->query('round');

        return response()->json($this->votes->hasVoted(
            $user->organization_id,
            $electionId,
            $user->id,
            $round !== null ? (int) $round : null,
        ));
    }

    public function requestOtp(Request $request, string $electionId): JsonResponse
    {
        $user = $request->user();

        return response()->json($this->votes->requestVoteOtp(
            $user->organization_id,
            $electionId,
            $user->id,
        ));
    }

    public function cast(CastVoteRequest $request): JsonResponse
    {
        $user = $request->user();

        return response()->json($this->votes->castVote(
            $user->organization_id,
            $request->input('electionId'),
            $request->input('choices'),
            $request->input('otp'),
            $user->id,
            $request->ip(),
        ));
    }
}
