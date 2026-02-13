package com.homeservices.controller;

import com.homeservices.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/jobs")
@RequiredArgsConstructor
@Tag(name = "Admin Jobs", description = "Admin job triggers (e.g. dev only)")
public class AdminJobController {

    private final OrderService orderService;

    @PostMapping("/run-timeouts")
    @Operation(summary = "Manually run dispatch timeout job (process expired merchant assign and worker accept)")
    public ResponseEntity<Map<String, Integer>> runTimeouts() {
        int merchantExpired = orderService.processMerchantAssignTimeouts();
        int workerRollback = orderService.processWorkerAcceptTimeouts();
        return ResponseEntity.ok(Map.of(
            "merchantAssignExpired", merchantExpired,
            "workerAcceptRollback", workerRollback
        ));
    }
}
