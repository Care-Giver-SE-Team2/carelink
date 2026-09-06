package sg.nus.carelink.rostering.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.rostering.domain.model.RosteringCandidate;
import sg.nus.carelink.rostering.domain.repository.RosteringCandidateRepository;
import sg.nus.carelink.rostering.infrastructure.persistence.repository.RosteringCandidateJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class RosteringCandidateRepositoryAdapter implements RosteringCandidateRepository {

	private final RosteringCandidateJpaRepository jpa;

	RosteringCandidateRepositoryAdapter(RosteringCandidateJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<RosteringCandidate> findById(Long id) {
		return jpa.findById(id).map(RosteringCandidateMapper::toDomain);
	}

	@Override
	public RosteringCandidate save(RosteringCandidate rosteringCandidate) {
		return RosteringCandidateMapper.toDomain(jpa.save(RosteringCandidateMapper.toEntity(rosteringCandidate)));
	}
}
