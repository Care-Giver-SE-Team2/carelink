package sg.nus.carelink.report.domain.repository;

import java.util.List;
import java.util.Optional;

import sg.nus.carelink.report.domain.model.ValueAddedService;

/** Persistence port for the value-added service catalogue. */
public interface ValueAddedServiceRepository {
    Optional<ValueAddedService> findById(Long id);
    List<ValueAddedService> findAvailable();
    ValueAddedService save(ValueAddedService valueAddedService);
}
