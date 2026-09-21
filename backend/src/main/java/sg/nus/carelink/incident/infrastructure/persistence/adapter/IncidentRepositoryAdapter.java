package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;
import sg.nus.carelink.incident.infrastructure.persistence.entity.IncidentJpaEntity;
import sg.nus.carelink.incident.infrastructure.persistence.repository.IncidentJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class IncidentRepositoryAdapter implements IncidentRepository {

	/**
	 * The states that still owe somebody a response. Mirrors
	 * {@code Incident.awaitingTakeOver()}; kept here because the Spring Data query needs the
	 * persistence enum, while the rule itself is stated once in the domain model.
	 */
	private static final Set<IncidentJpaEntity.Status> AWAITING_TAKE_OVER =
			Set.of(IncidentJpaEntity.Status.OPEN, IncidentJpaEntity.Status.ACKNOWLEDGED);

	private final IncidentJpaRepository jpa;

	IncidentRepositoryAdapter(IncidentJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<Incident> findById(Long id) {
		return jpa.findById(id).map(IncidentMapper::toDomain);
	}

	@Override
	public Incident save(Incident incident) {
		return IncidentMapper.toDomain(jpa.save(IncidentMapper.toEntity(incident)));
	}

	@Override
	public List<Incident> findAwaitingTakeOverPastDeadline(LocalDateTime deadline) {
		return jpa
				.findByStatusInAndRespondByNotNullAndRespondByLessThanEqualOrderByRespondByAsc(
						AWAITING_TAKE_OVER, deadline)
				.stream()
				.map(IncidentMapper::toDomain)
				.toList();
	}

	@Override
	public Optional<Long> lastResponderForElder(Long elderId, Long excludingIncidentId) {
		if (elderId == null) {
			return Optional.empty();
		}
		// -1 rather than null: the derived query needs a value to compare against, and no
		// row can carry that id, so an incident that has not been saved yet excludes nothing.
		Long excluded = excludingIncidentId == null ? -1L : excludingIncidentId;
		return jpa
				.findByElderIdAndIdNotAndResponderUserIdNotNullOrderByReportedAtDesc(
						elderId, excluded, PageRequest.of(0, 1))
				.stream()
				.findFirst()
				.map(IncidentJpaEntity::getResponderUserId);
	}

	@Override
	public List<Incident> findByElder(Long elderId) {
		return jpa.findByElderIdOrderByReportedAtDesc(elderId).stream()
				.map(IncidentMapper::toDomain)
				.toList();
	}
}
