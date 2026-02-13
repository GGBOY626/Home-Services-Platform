package com.homeservices.service;

import com.homeservices.repository.MerchantProfileRepository;
import com.homeservices.repository.WorkerProfileRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final MerchantProfileRepository merchantProfileRepository;
    private final WorkerProfileRepository workerProfileRepository;

    public Optional<UUID> getMerchantId(JwtPrincipal principal) {
        return merchantProfileRepository.findByAccountId(principal.id())
            .map(m -> m.getId());
    }

    public Optional<UUID> getWorkerId(JwtPrincipal principal) {
        return workerProfileRepository.findByAccountId(principal.id())
            .map(w -> w.getId());
    }
}
