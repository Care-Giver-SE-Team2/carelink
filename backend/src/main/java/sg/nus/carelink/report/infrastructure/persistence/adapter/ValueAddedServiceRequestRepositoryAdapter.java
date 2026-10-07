package sg.nus.carelink.report.infrastructure.persistence.adapter;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.report.domain.model.ValueAddedServiceRequest;
import sg.nus.carelink.report.domain.repository.ValueAddedServiceRequestRepository;
import sg.nus.carelink.report.infrastructure.persistence.repository.ValueAddedServiceRequestJpaRepository;

@Repository
class ValueAddedServiceRequestRepositoryAdapter implements ValueAddedServiceRequestRepository {
    private final ValueAddedServiceRequestJpaRepository jpa;

    ValueAddedServiceRequestRepositoryAdapter(ValueAddedServiceRequestJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Optional<ValueAddedServiceRequest> findById(Long id) {
        return jpa.findById(id).map(ValueAddedServiceRequestMapper::toDomain);
    }

    @Override
    public List<ValueAddedServiceRequest> findByElderId(Long elderId) {
        return jpa.findByElderIdOrderByCreatedAtDesc(elderId).stream()
                .map(ValueAddedServiceRequestMapper::toDomain).toList();
    }

    @Override
    public ValueAddedServiceRequest save(ValueAddedServiceRequest request) {
        return ValueAddedServiceRequestMapper.toDomain(jpa.save(ValueAddedServiceRequestMapper.toEntity(request)));
    }
}
